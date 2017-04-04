function getList() {

    var conn = $.db.getConnection();
    var pstmt = conn.prepareStatement(
            
            
        "SELECT KOD_IT ,  IT_NAME FROM " +
        " \"_SYS_BIC\".\"kpi_cio.models.SM/CV_BO_IT\" "
    );
    var rs = pstmt.executeQuery();
    var data = [];
    while (rs.next()) {
        data.push({
            "iId": rs.getNString(1),
            "sName": rs.getNString(2),
          });
    }

    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;
    // conn.commit();
    conn.close();

}
getList();
